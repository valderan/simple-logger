// Command add_ping_service registers a new ping check for the project.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const (
    pingToken = "<token>"
    pingProjectUUID = "<project-uuid>"
)

func main() {
    payload := map[string]any{
        "name":         "Billing health-check",
        "url":          "https://billing.example.com/health",
        "interval":     60,
        "telegramTags": []string{"PING_DOWN"},
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest(http.MethodPost, baseURL+"/projects/"+pingProjectUUID+"/ping-services", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+pingToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        data, _ := io.ReadAll(resp.Body)
        panic(fmt.Sprintf("unexpected status %d: %s", resp.StatusCode, data))
    }

    var service map[string]any
    if err := json.NewDecoder(resp.Body).Decode(&service); err != nil {
        panic(err)
    }

    fmt.Println("Created ping service:", service)
}
