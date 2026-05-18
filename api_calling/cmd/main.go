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

type RecommendJobPayload struct {
	JobID       string `json:"jobId"`
	UserID      string `json:"userId"`
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	Date        int    `json:"date"`
}

func main() {
	cfg := config.LoadConfig()

	// 1. Khởi tạo Redis Client
	redisAddr := strings.TrimSpace(os.Getenv("REDIS_ADDR"))
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
	if secretPwd := strings.TrimSpace(os.Getenv("REDIS_PASSWORD")); secretPwd != "" {
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
	recommendEnrichTopic := psClient.Topic("recommend-enrich")
	transitEnrichTopic := psClient.Topic("transit-enrich")

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

	// Added Pub/Sub Push Endpoint for Recommendation Jobs
	r.POST("/pubsub/recommend-push", func(c *gin.Context) {
		var msg PubSubMessage
		if err := c.ShouldBindJSON(&msg); err != nil {
			log.Println("Invalid recommend push payload:", err)
			c.Status(http.StatusBadRequest)
			return
		}

		var job RecommendJobPayload
		if err := json.Unmarshal(msg.Message.Data, &job); err != nil {
			log.Println("Error unmarshaling recommend job data:", err)
			c.Status(http.StatusOK)
			return
		}

		log.Printf("Processing recommend job %s for user %s", job.JobID, job.UserID)

		// Get Origin coordinates
		var originLat, originLon float64
		originData, err := mClient.GetLocation(job.Origin)
		if err == nil && originData != nil && len(originData.Results) > 0 {
			originLat = originData.Results[0].Geometry.Location.Lat
			originLon = originData.Results[0].Geometry.Location.Lng
			log.Printf("Resolved Origin '%s' to [%f, %f]", job.Origin, originLat, originLon)
		} else {
			log.Printf("Failed to get origin coordinates for %s: %v", job.Origin, err)
		}

		// Get Destination coordinates
		var destLat, destLon float64
		destData, err := mClient.GetLocation(job.Destination)
		if err == nil && destData != nil && len(destData.Results) > 0 {
			destLat = destData.Results[0].Geometry.Location.Lat
			destLon = destData.Results[0].Geometry.Location.Lng
			log.Printf("Resolved Destination '%s' to [%f, %f]", job.Destination, destLat, destLon)
		} else {
			log.Printf("Failed to get destination coordinates for %s: %v", job.Destination, err)
		}

		if originLat == 0 || originLon == 0 || destLat == 0 || destLon == 0 {
			log.Printf("Aborting recommend job: Invalid coordinates for '%s' -> '%s'", job.Origin, job.Destination)
			c.JSON(http.StatusOK, gin.H{"status": "error", "message": "Could not resolve locations to coordinates"})
			return
		}

		// Mock budget since preferences DB is not hooked up here yet
		budget := 500000.0

		recommendPayload := map[string]interface{}{
			"job_id":  job.JobID,
			"user_id": job.UserID,
			"action":  "recommend_vehicle",
			"payload": map[string]interface{}{
				"origin": map[string]interface{}{
					"lat": originLat,
					"lon": originLon,
				},
				"destination": map[string]interface{}{
					"lat": destLat,
					"lon": destLon,
				},
				"date": job.Date,
				"user": map[string]interface{}{
					"user_id": job.UserID,
					"budget":  budget,
				},
			},
		}

		enrichedBytes, _ := json.Marshal(recommendPayload)
		publishRes := recommendEnrichTopic.Publish(ctx, &pubsub.Message{
			Data: enrichedBytes,
		})

		_, err = publishRes.Get(ctx)
		if err != nil {
			log.Printf("Failed to publish to recommend-enrich: %v", err)
			errPayload := map[string]interface{}{
				"jobId":  job.JobID,
				"userId": job.UserID,
				"status": "error",
				"result": "Failed to dispatch vehicle recommendation.",
			}
			errBytes, _ := json.Marshal(errPayload)
			resultsTopic.Publish(ctx, &pubsub.Message{Data: errBytes})
		} else {
			log.Printf("Successfully published enriched job %s to recommend-enrich", job.JobID)
		}

		c.Status(http.StatusOK)
	})

	// Added Pub/Sub Push Endpoint for Transit Routing Jobs
	r.POST("/pubsub/transit-push", func(c *gin.Context) {
		var msg PubSubMessage
		if err := c.ShouldBindJSON(&msg); err != nil {
			log.Println("Invalid transit push payload:", err)
			c.Status(http.StatusBadRequest)
			return
		}

		var job RecommendJobPayload
		if err := json.Unmarshal(msg.Message.Data, &job); err != nil {
			log.Println("Error unmarshaling transit job data:", err)
			c.Status(http.StatusOK)
			return
		}

		log.Printf("Processing transit job %s for user %s", job.JobID, job.UserID)

		// Get Origin coordinates
		var originLat, originLon float64
		originData, err := mClient.GetLocation(job.Origin)
		if err == nil && originData != nil && len(originData.Results) > 0 {
			originLat = originData.Results[0].Geometry.Location.Lat
			originLon = originData.Results[0].Geometry.Location.Lng
			log.Printf("Resolved Transit Origin '%s' to [%f, %f]", job.Origin, originLat, originLon)
		} else {
			log.Printf("Failed to get transit origin coordinates for %s: %v", job.Origin, err)
		}

		// Get Destination coordinates
		var destLat, destLon float64
		destData, err := mClient.GetLocation(job.Destination)
		if err == nil && destData != nil && len(destData.Results) > 0 {
			destLat = destData.Results[0].Geometry.Location.Lat
			destLon = destData.Results[0].Geometry.Location.Lng
			log.Printf("Resolved Transit Destination '%s' to [%f, %f]", job.Destination, destLat, destLon)
		} else {
			log.Printf("Failed to get transit destination coordinates for %s: %v", job.Destination, err)
		}

		if originLat == 0 || originLon == 0 || destLat == 0 || destLon == 0 {
			log.Printf("Aborting transit job: Invalid coordinates for '%s' -> '%s'", job.Origin, job.Destination)
			c.JSON(http.StatusOK, gin.H{"status": "error", "message": "Could not resolve locations to coordinates"})
			return
		}

		// Determine the city code based on latitude (HN: ~21.0, HCMC: ~10.8)
		cityCode := "hcmc"
		if originLat > 16.0 {
			cityCode = "hn"
		}

		// Compile the payload matching the transit_db's TransitRequest schema
		transitPayload := map[string]interface{}{
			"job_id":  job.JobID,
			"user_id": job.UserID,
			"action":  "transit_routing",
			"payload": map[string]interface{}{
				"city": cityCode,
				"locations": []map[string]interface{}{
					{"lat": originLat, "lon": originLon},
					{"lat": destLat, "lon": destLon},
				},
				"top_k":           3,
				"max_walk_meters": 1000.0,
				"combine_routes":  true,
			},
		}

		enrichedBytes, _ := json.Marshal(transitPayload)
		publishRes := transitEnrichTopic.Publish(ctx, &pubsub.Message{
			Data: enrichedBytes,
		})

		_, err = publishRes.Get(ctx)
		if err != nil {
			log.Printf("Failed to publish to transit-enrich: %v", err)
			errPayload := map[string]interface{}{
				"jobId":  job.JobID,
				"userId": job.UserID,
				"status": "error",
				"result": "Failed to dispatch transit suggestions.",
			}
			errBytes, _ := json.Marshal(errPayload)
			resultsTopic.Publish(ctx, &pubsub.Message{Data: errBytes})
		} else {
			log.Printf("Successfully published enriched job %s to transit-enrich", job.JobID)
		}

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
