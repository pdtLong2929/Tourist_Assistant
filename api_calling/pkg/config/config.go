package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Weather_API_Key  string
	Location_API_Key string
	AI_Model_Key     string
	Server_Port      string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	return &Config{
		Weather_API_Key:  os.Getenv("WEATHER_API_KEY"),
		Location_API_Key: os.Getenv("LOCATION_API_KEY"),
		AI_Model_Key:     os.Getenv("AI_MODEL_KEY"),
		Server_Port:      os.Getenv("SERVER_PORT"),
	}
}
