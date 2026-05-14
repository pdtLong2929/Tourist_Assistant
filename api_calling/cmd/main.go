package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"cloud.google.com/go/pubsub"
	"github.com/gin-gonic/gin"
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	"github.com/pdtLong2929/Tourist_Assistant/internal/handler"
	model "github.com/pdtLong2929/Tourist_Assistant/internal/models"
	"github.com/pdtLong2929/Tourist_Assistant/internal/service"
	"github.com/pdtLong2929/Tourist_Assistant/pkg/config"
	"github.com/redis/go-redis/v9"
)

type PubSubMessage struct {
	Message struct {
		Data       []byte            `json:"data"`
		MessageID  string            `json:"messageId"`
		Attributes map[string]string `json:"attributes"`
	} `json:"message"`
	Subscription string `json:"subscription"`
}

type DirectEnrichRequest struct {
	UserID      string                  `json:"userId" binding:"required"`
	Query       string                  `json:"query" binding:"required"`
	JobType     string                  `json:"jobType"`
	Destination *model.LocationResponse `json:"destination"`
}

func main() {
	cfg := config.LoadConfig()

	// 1. Khởi tạo Redis Client
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	var opt *redis.Options
	var err error

	if strings.HasPrefix(redisAddr, "redis://") || strings.HasPrefix(redisAddr, "rediss://") {
		opt, err = redis.ParseURL(redisAddr)
		if err != nil {
			log.Fatalf("Failed to parse redis URL: %v", err)
		}
	} else {
		opt = &redis.Options{
			Addr:     redisAddr,
		}
	}

	// Enforce password from Secret Manager if provided as an independent environment variable
	if secretPwd := os.Getenv("REDIS_PASSWORD"); secretPwd != "" {
		opt.Password = secretPwd
	}

	rdb := redis.NewClient(opt)

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		fmt.Println("Can not connect to redis!", err)
	}

	// Initialize Pub/Sub client
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "test-project"
	}

	psClient, err := pubsub.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create pubsub client: %v", err)
	}
	defer psClient.Close()

	enrichTopic := psClient.Topic("task-enrich")
	resultsTopic := psClient.Topic("ai-results")

	// 2. Khởi tạo các Clients
	mClient := client.NewMapClient(cfg.Location_API_Key)
	wClient := client.NewWeatherClient(cfg.Weather_API_Key)
	aClient := client.NewAIClient("http://ai-model-service:5000")

	// 3. Truyền rdb vào NewTouristService
	tService := service.NewTouristService(mClient, wClient, aClient, rdb)

	lHandler := handler.NewLocationHandler(&tService)

	r := gin.Default()

	v1 := r.Group("/api/v1")
	{
		v1.GET("/location/:name", lHandler.HandleGetLocation)
		
		// Directly publish enriched job payload to Pub/Sub task-enrich
		v1.POST("/jobs/enrich", func(c *gin.Context) {
			var req DirectEnrichRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			jobID := fmt.Sprintf("job-%s", req.UserID)

			// Build already-enriched payload using the passed destination data
			enrichedPayload := model.EnrichedJobPayload{
				JobPayload: model.JobPayload{
					JobID:   jobID,
					UserID:  req.UserID,
					Query:   req.Query,
					JobType: req.JobType,
				},
				LocationData: req.Destination,
			}

			enrichedBytes, _ := json.Marshal(enrichedPayload)

			// Publish directly to 'task-enrich' Pub/Sub topic
			result := enrichTopic.Publish(ctx, &pubsub.Message{
				Data: enrichedBytes,
			})

			_, err := result.Get(ctx)
			if err != nil {
				log.Println("Error publishing directly to task-enrich:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish task"})
				return
			}

			c.JSON(http.StatusAccepted, gin.H{
				"message": "Direct enriched job queued successfully",
				"jobId":   jobID,
			})
		})
	}

	// Added Pub/Sub Push Endpoint
	r.POST("/pubsub/push", func(c *gin.Context) {
		var msg PubSubMessage
		if err := c.ShouldBindJSON(&msg); err != nil {
			log.Println("Invalid push payload:", err)
			c.Status(http.StatusBadRequest)
			return
		}

		var job model.JobPayload
		if err := json.Unmarshal(msg.Message.Data, &job); err != nil {
			log.Println("Error unmarshaling job data:", err)
			c.Status(http.StatusOK) // Acknowledge anyway so it's not stuck
			return
		}

		log.Printf("Enrichment processing job %s for user %s, query: '%s'", job.JobID, job.UserID, job.Query)

		// Perform enrichment
		result, err := tService.GetLocationDetail(c.Request.Context(), job.Query)

		if err != nil {
			log.Printf("Warning: Could not enrich job %s: %v. Proceeding with user raw query only.", job.JobID, err)
			// result is nil here, which allows us to proceed with fallback in the next step
		}


		// Successfully enriched! Forward to worker via task-enrich
		enrichedPayload := model.EnrichedJobPayload{
			JobPayload:   job,
			LocationData: result,
		}
		enrichedBytes, _ := json.Marshal(enrichedPayload)
		
		publishRes := enrichTopic.Publish(ctx, &pubsub.Message{
			Data: enrichedBytes,
		})
		
		_, err = publishRes.Get(ctx)
		if err != nil {
			log.Printf("Failed to publish enriched job to task-enrich: %v", err)
			// Fallback to notifying the client if messaging queue publish fails
			errPayload := map[string]interface{}{
				"jobId":  job.JobID,
				"userId": job.UserID,
				"status": "error",
				"result": "System error: could not dispatch task for enrichment processing.",
			}
			errBytes, _ := json.Marshal(errPayload)
			resultsTopic.Publish(ctx, &pubsub.Message{Data: errBytes})
			c.Status(http.StatusOK)
			return
		}

		log.Printf("Successfully published enriched job %s to task-enrich", job.JobID)
		c.Status(http.StatusOK)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Running API calling service on port: ", port)
	fmt.Println("Redis connecting at :", redisAddr)
	
	r.Run(":" + port)
}
