package client

import (
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/pdtLong2929/Tourist_Assistant/pkg/errs"
)

// XÓA: MapClient struct, NewMapClient function và GoongResponse struct nếu đã có ở file khác.
// Bạn chỉ cần khai báo thêm phương thức mới cho MapClient hiện có.

// GetNearbyVehicles là hàm mới để tìm nơi thuê xe dựa trên tọa độ
func (c *MapClient) GetNearbyVehicles(lat, lng float64, vehicleType string) (*GoongResponse, error) {
    radius := 5000 // 5km
    keyword := "cho+thuê+xe+máy"
    if vehicleType == "car" {
        keyword = "cho+thuê+xe+ô+tô"
    }

    apiURL := fmt.Sprintf("https://rsapi.goong.io/Place/NearbySearch?location=%f,%f&radius=%d&keyword=%s&api_key=%s", 
        lat, lng, radius, keyword, c.ApiKey)

    res, err := http.Get(apiURL)
    if err != nil {
        return nil, errs.ErrNetwork
    }
    defer res.Body.Close()

    if res.StatusCode != http.StatusOK {
        return nil, errs.ErrInvalidKey
    }

    var data GoongResponse
    if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
        return nil, errs.ErrInternalServer
    }

    return &data, nil
}