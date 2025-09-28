// Command update_project demonstrates updating a project via the Simple Logger API.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

const (
    baseURL        = "http://localhost:3000/api"
    updateToken    = "<token>"
    updateProjectUUID = "<project-uuid>"
)

func main() {
    payload := map[string]any{
        "name":        "Orders Service",
        "description": "Updated description with SLA requirements",
        "logFormat":   map[string]string{"level": "string", "message": "string", "timestamp": "ISO8601"},
        "defaultTags": []string{"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"},
        "customTags":  []string{"PAYMENT", "SHIPPING"},
        "accessLevel": "global",
        "telegramNotify": map[string]any{
            "enabled":          true,
            "recipients":       []map[string]any{{"chatId": "123456", "tags": []string{"ERROR", "CRITICAL"}}},
            "antiSpamInterval": 20,
        },
        "debugMode":     false,
        "maxLogEntries": 0,
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest(http.MethodPut, baseURL+"/projects/"+updateProjectUUID, bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+updateToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        data, _ := io.ReadAll(resp.Body)
        fmt.Fprintln(os.Stderr, string(data))
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var project struct {
        Description string `json:"description"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&project); err != nil {
        panic(err)
    }

    fmt.Println("Project updated. New description:", project.Description)
}
