package model

type JobPayload struct {
	JobID   string `json:"jobId"`
	UserID  string `json:"userId"`
	Query   string `json:"query"`
	JobType string `json:"jobType"`
}

type EnrichedJobPayload struct {
	JobPayload
	LocationData *LocationResponse `json:"locationData,omitempty"`
}
