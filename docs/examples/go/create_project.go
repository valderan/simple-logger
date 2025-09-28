// Command create_project shows how to create a project using the Simple Logger API.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

const adminToken = "<token>"

func main() {
    payload := map[string]any{
        "name":         "Orders Service",
        "description":  "Handles order placement and payment flows",
        "logFormat":    map[string]string{"level": "string", "message": "string", "timestamp": "ISO8601"},
        "customTags":   []string{"PAYMENT", "SHIPPING"},
        "telegramNotify": map[string]any{
            "enabled":          true,
            "recipients":       []map[string]any{{"chatId": "123456", "tags": []string{"ERROR", "CRITICAL"}}},
            "antiSpamInterval": 30,
        },
        "debugMode":     false,
        "maxLogEntries": 0,
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest(http.MethodPost, baseURL+"/projects", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+adminToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        data, _ := io.ReadAll(resp.Body)
        fmt.Fprintln(os.Stderr, string(data))
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var project struct {
        UUID string `json:"uuid"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&project); err != nil {
        panic(err)
    }

    fmt.Println("Created project UUID:", project.UUID)
}
