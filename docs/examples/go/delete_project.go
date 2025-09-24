// Command delete_project removes a project and its logs via the Simple Logger API.
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

const (
    deleteBaseURL = "http://localhost:3000/api"
    deleteToken   = "<token>"
    deleteUUID    = "<project-uuid>"
)

func main() {
    req, _ := http.NewRequest(http.MethodDelete, deleteBaseURL+"/projects/"+deleteUUID, nil)
    req.Header.Set("Authorization", "Bearer "+deleteToken)

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

    var result struct {
        DeletedLogs        int `json:"deletedLogs"`
        DeletedPingServices int `json:"deletedPingServices"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        panic(err)
    }

    fmt.Printf("Project deleted. Logs removed: %d, ping-services removed: %d\n", result.DeletedLogs, result.DeletedPingServices)
}
