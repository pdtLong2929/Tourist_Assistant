package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/pubsub"
	"github.com/gin-gonic/gin"
)

type JobRequest struct {
	UserID    string `json:"userId" binding:"required"`
	Query     string `json:"query" binding:"required"`
	JobType   string `json:"jobType"`
}

func main() {
	r := gin.Default()

	// Initialize Pub/Sub client
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "test-project"
	}

	ctx := context.Background()
	client, err := pubsub.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}
	defer client.Close()

	topic := client.Topic("ai-jobs")

	// Endpoint to receive requests from Frontend
	r.POST("/api/v1/jobs/submit", func(c *gin.Context) {
		var req JobRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// In a real app, you would validate the user token against the Login service here
		jobID := fmt.Sprintf("job-%s", req.UserID) // simple mock job ID

		jobPayload := map[string]interface{}{
			"jobId":   jobID,
			"userId":  req.UserID,
			"query":   req.Query,
			"jobType": req.JobType,
		}

		payloadBytes, _ := json.Marshal(jobPayload)

		// Publish to Pub/Sub
		result := topic.Publish(ctx, &pubsub.Message{
			Data: payloadBytes,
		})

		_, err := result.Get(ctx)
		if err != nil {
			log.Println("Error publishing to Pub/Sub:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue job"})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{
			"message": "Job queued successfully",
			"jobId":   jobID,
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("API Service running on port %s", port)
	r.Run(":" + port)
}
