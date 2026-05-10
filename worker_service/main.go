package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/pubsub"
	"github.com/gin-gonic/gin"
)

type PubSubMessage struct {
	Message struct {
		Data       []byte            `json:"data"` // Base64 decoded by Gin automatically? No, standard library JSON might base64 decode byte[] if it's base64 in json. Wait, in Go, a `[]byte` field in a struct is automatically base64 decoded by `json.Unmarshal`!
		MessageID  string            `json:"messageId"`
		Attributes map[string]string `json:"attributes"`
	} `json:"message"`
	Subscription string `json:"subscription"`
}

type JobPayload struct {
	JobID   string `json:"jobId"`
	UserID  string `json:"userId"`
	Query   string `json:"query"`
	JobType string `json:"jobType"`
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

	topic := client.Topic("ai-results")

	r.POST("/pubsub/push", func(c *gin.Context) {
		var msg PubSubMessage
		if err := c.ShouldBindJSON(&msg); err != nil {
			log.Println("Invalid payload:", err)
			c.Status(http.StatusBadRequest)
			return
		}

		var job JobPayload
		if err := json.Unmarshal(msg.Message.Data, &job); err != nil {
			log.Println("Error unmarshaling job data:", err)
			c.Status(http.StatusBadRequest) // Acknowledge to prevent infinite retries
			return
		}

		log.Printf("Worker processing job %s for user %s: '%s'", job.JobID, job.UserID, job.Query)

		// Contact the RAG Service
		ragReqBody, _ := json.Marshal(map[string]string{"query": job.Query})
		ragResp, err := http.Post("http://rag:8000/rag/suggest", "application/json", bytes.NewBuffer(ragReqBody))
		var aiResultText string
		if err != nil {
			log.Println("Error calling RAG service:", err)
			aiResultText = "Error: Failed to get RAG response"
		} else {
			defer ragResp.Body.Close()
			bodyBytes, _ := io.ReadAll(ragResp.Body)
			
			var ragRespData map[string]interface{}
			if err := json.Unmarshal(bodyBytes, &ragRespData); err == nil && ragRespData["suggestion"] != nil {
				aiResultText = fmt.Sprintf("%v", ragRespData["suggestion"])
			} else {
				aiResultText = string(bodyBytes)
			}
		}

		// Create Result Payload
		resultPayload := map[string]interface{}{
			"jobId":  job.JobID,
			"userId": job.UserID,
			"status": "completed",
			"result": aiResultText,
		}

		resultBytes, _ := json.Marshal(resultPayload)

		// Publish result back to Pub/Sub
		publishResult := topic.Publish(ctx, &pubsub.Message{
			Data: resultBytes,
		})

		_, err = publishResult.Get(ctx)
		if err != nil {
			log.Println("Error publishing result to ai-results:", err)
			c.Status(http.StatusInternalServerError)
			return
		}

		log.Printf("Result published for job %s", job.JobID)
		c.Status(http.StatusOK) // Acknowledge message processing
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	log.Printf("Worker Service running on port %s", port)
	r.Run(":" + port)
}
