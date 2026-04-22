package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pdtLong2929/Tourist_Assistant/internal/service"
)

type LocationHandler struct {
	svc service.TouristService
}

func NewLocationHandler(s service.TouristService) *LocationHandler {
	return &LocationHandler{svc: s}
}

func (h *LocationHandler) HandleGetLocation(c *gin.Context) {
	detail := c.Param("name")

	result, err := h.svc.GetLocationDetail(detail)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error(), "code": 404})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   result,
	})
}
