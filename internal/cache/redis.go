package cache

import (
	"context"
	"time"
	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client

// InitRedis khởi tạo kết nối
func InitRedis(addr string) {
	RDB = redis.NewClient(&redis.Options{
		Addr: addr,
	})
}

// Get thu thập dữ liệu từ cache
func Get(ctx context.Context, key string) (string, error) {
	return RDB.Get(ctx, key).Result()
}

// Set lưu dữ liệu vào cache với TTL
func Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return RDB.Set(ctx, key, value, ttl).Err()
}