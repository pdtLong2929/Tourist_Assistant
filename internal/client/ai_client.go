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

	// payload := map[string]interface{}{"city": city, "temp": temp, "desc": desc}
	// jsonData, _ := json.Marshal(payload)
	// resp, err := http.Post(c.BaseURL+"/v1/predict", "application/json", bytes.NewBuffer(jsonData))
	// if err == nil {}

	return fmt.Sprintf("Recommend: At %s, the weather is %s, %v°C. You should............", city, desc, temp)
}
