package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type RideLegRequest struct {
	DistanceKm      float64  `json:"distance_km"`
	LocationType    string   `json:"location_type"`
	VehicleCategory *string  `json:"vehicle_category,omitempty"`
	OriginLat       *float64 `json:"origin_lat,omitempty"`
	OriginLon       *float64 `json:"origin_lon,omitempty"`
	DestinationLat  *float64 `json:"destination_lat,omitempty"`
	DestinationLon  *float64 `json:"destination_lon,omitempty"`
}

type RideEstimateRequest struct {
	Legs      []RideLegRequest `json:"legs"`
	City      string           `json:"city"`
	TopK      int              `json:"top_k"`
	PromoCode *string          `json:"promo_code,omitempty"`
}

type MatchedDriver struct {
	DriverID           string  `json:"driver_id"`
	Name               string  `json:"name"`
	Rating             float64 `json:"rating"`
	Phone              string  `json:"phone"`
	PlateNumber        string  `json:"plate_number"`
	DistanceToPickupKm float64 `json:"distance_to_pickup_km"`
	ETAMinutes         float64 `json:"eta_minutes"`
}

type RideOption struct {
	Service       string         `json:"service"`
	Category      string         `json:"category"`
	BaseFare      int            `json:"base_fare"`
	FinalFare     int            `json:"final_fare"`
	AppliedPromos []string       `json:"applied_promos"`
	Status        string         `json:"status"`
	MatchedDriver *MatchedDriver `json:"matched_driver,omitempty"`
}

type RideLegResponse struct {
	LegID      string       `json:"leg_id"`
	FromIndex  int          `json:"from_index"`
	ToIndex    int          `json:"to_index"`
	DistanceKm float64      `json:"distance_km"`
	Options    []RideOption `json:"options"`
}

type RideEstimateResponse struct {
	Status string            `json:"status"`
	Data   []RideLegResponse `json:"data"`
}

type RideHailingClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

func NewRideHailingClient(baseURL string) *RideHailingClient {
	if baseURL == "" {
		baseURL = "http://ride_hailing_service:8003"
	}
	return &RideHailingClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *RideHailingClient) EstimateFare(legs []RideLegRequest, city string, topK int, promoCode *string) (*RideEstimateResponse, error) {
	reqPayload := RideEstimateRequest{
		Legs:      legs,
		City:      city,
		TopK:      topK,
		PromoCode: promoCode,
	}

	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ride estimate request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/ride/estimate", c.BaseURL)
	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request to ride hailing service: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request to ride hailing service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ride hailing service returned status code %d", resp.StatusCode)
	}

	var estimateResp RideEstimateResponse
	if err := json.NewDecoder(resp.Body).Decode(&estimateResp); err != nil {
		return nil, fmt.Errorf("failed to decode response from ride hailing service: %w", err)
	}

	return &estimateResp, nil
}

// --- SMART COUPON SYSTEM ---

type CouponLegRequest struct {
	BaseFare     int    `json:"base_fare"`
	LocationType string `json:"location_type"`
	ServiceID    string `json:"service_id"`
}

type SmartCouponRequest struct {
	City      string             `json:"city"`
	Legs      []CouponLegRequest `json:"legs"`
	PromoCode *string            `json:"promo_code,omitempty"`
}

type CouponLegResponse struct {
	LegIndex      int      `json:"leg_index"`
	ServiceID     string   `json:"service_id"`
	BaseFare      int      `json:"base_fare"`
	FinalFare     int      `json:"final_fare"`
	AppliedPromos []string `json:"applied_promos"`
	CostSaved     int      `json:"cost_saved"`
	Status        string   `json:"status"`
}

type SmartCouponResponse struct {
	Status     string              `json:"status"`
	TotalSaved int                 `json:"total_saved"`
	Data       []CouponLegResponse `json:"data"`
}

func (c *RideHailingClient) ApplySmartCoupons(legs []CouponLegRequest, city string, promoCode *string) (*SmartCouponResponse, error) {
	reqPayload := SmartCouponRequest{
		Legs:      legs,
		City:      city,
		PromoCode: promoCode,
	}

	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal smart coupon request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/ride/coupon/apply", c.BaseURL)
	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request to ride hailing service: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request to ride hailing service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ride hailing service returned status code %d", resp.StatusCode)
	}

	var couponResp SmartCouponResponse
	if err := json.NewDecoder(resp.Body).Decode(&couponResp); err != nil {
		return nil, fmt.Errorf("failed to decode response from ride hailing service: %w", err)
	}

	return &couponResp, nil
}

type SmartCouponPreviewResponse struct {
	Status  string         `json:"status"`
	Savings map[string]int `json:"savings"`
}

func (c *RideHailingClient) PreviewSmartCoupons(legs []CouponLegRequest, city string) (*SmartCouponPreviewResponse, error) {
	reqPayload := SmartCouponRequest{
		Legs:      legs,
		City:      city,
		PromoCode: nil,
	}

	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal smart coupon preview request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/ride/coupon/preview", c.BaseURL)
	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request to ride hailing service: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request to ride hailing service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ride hailing service returned status code %d", resp.StatusCode)
	}

	var previewResp SmartCouponPreviewResponse
	if err := json.NewDecoder(resp.Body).Decode(&previewResp); err != nil {
		return nil, fmt.Errorf("failed to decode response from ride hailing service: %w", err)
	}

	return &previewResp, nil
}

