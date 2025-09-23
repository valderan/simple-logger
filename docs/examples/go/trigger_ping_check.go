// Command trigger_ping_check performs a manual ping run.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

const (
    triggerToken = "<token>"
    triggerProjectUUID = "<project-uuid>"
)

func main() {
    req, _ := http.NewRequest(http.MethodPost, baseURL+"/projects/"+triggerProjectUUID+"/ping-services/check", nil)
    req.Header.Set("Authorization", "Bearer "+triggerToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var services []map[string]any
    if err := json.NewDecoder(resp.Body).Decode(&services); err != nil {
        panic(err)
    }

    fmt.Println("Ping results:", services)
}
