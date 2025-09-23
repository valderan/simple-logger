// Command ingest_log demonstrates how services can push logs to the collector.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const projectUUIDForLogs = "<project-uuid>"

func main() {
    payload := map[string]any{
        "uuid": projectUUIDForLogs,
        "log": map[string]any{
            "level":   "ERROR",
            "message": "Payment gateway returned non-200 response",
            "tags":    []string{"PAYMENT"},
            "metadata": map[string]any{
                "service": "billing-service",
                "user":    "user-42",
                "ip":      "10.0.0.12",
                "extra":   map[string]any{"orderId": "A-42"},
            },
        },
    }

    body, _ := json.Marshal(payload)
    resp, err := http.Post(baseURL+"/logs", "application/json", bytes.NewReader(body))
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        data, _ := io.ReadAll(resp.Body)
        panic(fmt.Sprintf("unexpected status %d: %s", resp.StatusCode, data))
    }

    var logEntry struct {
        ID string `json:"_id"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&logEntry); err != nil {
        panic(err)
    }

    fmt.Println("Stored log ID:", logEntry.ID)
}
