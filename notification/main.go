package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type ClientManager struct {
	sync.RWMutex
	clients map[string]*websocket.Conn
}

var manager = &ClientManager{
	clients: make(map[string]*websocket.Conn),
}

// PubSubMessage structure for GCP push subscriptions
type PubSubMessage struct {
	Message struct {
		Data       []byte            `json:"data"` // Base64 encoded payload
		MessageID  string            `json:"messageId"`
		Attributes map[string]string `json:"attributes"`
	} `json:"message"`
	Subscription string `json:"subscription"`
}

type ResultData struct {
	UserID string `json:"userId"`
	JobID  string `json:"jobId"`
	Status string `json:"status"`
	Result string `json:"result"` // e.g. the AI response
}

func main() {
	r := gin.Default()

	// Health check for Cloud Run
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// WebSocket endpoint for Frontend clients to connect
	r.GET("/ws", func(c *gin.Context) {
		userId := c.Query("userId")
		if userId == "" {
			c.JSON(400, gin.H{"error": "userId required parameter"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("WS upgrade err:", err)
			return
		}

		manager.Lock()
		manager.clients[userId] = conn
		manager.Unlock()
		log.Println("Client connected:", userId)

		defer func() {
			manager.Lock()
			delete(manager.clients, userId)
			manager.Unlock()
			conn.Close()
			log.Println("Client disconnected:", userId)
		}()

		for {
			// Keep alive or read pings
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	})

	// Webhook endpoint for Pub/Sub pushes
	r.POST("/pubsub/results", func(c *gin.Context) {
		var msg PubSubMessage
		if err := c.ShouldBindJSON(&msg); err != nil {
			log.Println("Invalid Pub/Sub payload:", err)
			c.Status(http.StatusBadRequest)
			return
		}

		// Go json.Unmarshal already base64 decodes []byte fields automatically!
		decodedData := msg.Message.Data

		var result ResultData
		if err := json.Unmarshal(decodedData, &result); err != nil {
			log.Println("Error unmarshaling result data:", err)
			c.Status(http.StatusOK) // Return 200 so pubsub doesn't retry invalid formats
			return
		}

		fmt.Printf("Received Result for Job %s, User %s\n", result.JobID, result.UserID)

		// Push to the connected user
		manager.RLock()
		conn, exists := manager.clients[result.UserID]
		manager.RUnlock()

		if exists {
			err := conn.WriteJSON(result)
			if err != nil {
				log.Println("Failed to write to WS:", err)
			}
		} else {
			log.Println("User not currently connected via WS:", result.UserID)
		}

		// Always return 200 OK so Pub/Sub knows it was delivered successfully
		c.Status(http.StatusOK)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Notification Service starting on port %s\n", port)
	r.Run(":" + port)
}
