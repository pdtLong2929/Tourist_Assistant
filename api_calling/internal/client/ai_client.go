package client

import (
	"fmt"
)

type AIClient struct {
	BaseURL string
}

func NewAIClient(baseURL string) *AIClient {
	return &AIClient{BaseURL: baseURL}
}

func (c *AIClient) GetTravelAdvice(city string, temp float64, desc string) string {
	return fmt.Sprintf("Recommend: At %s, the weather is %s, %v°C. You should............", city, desc, temp)
}
