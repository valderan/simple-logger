// Command filter_logs issues a GET /logs request with query parameters.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
)

const (
    filterToken = "<token>"
    filterProjectUUID = "<project-uuid>"
)

func main() {
    params := url.Values{}
    params.Set("uuid", filterProjectUUID)
    params.Set("level", "ERROR")
    params.Set("text", "payment")

    req, _ := http.NewRequest(http.MethodGet, baseURL+"/logs?"+params.Encode(), nil)
    req.Header.Set("Authorization", "Bearer "+filterToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var data struct {
        Logs []map[string]any `json:"logs"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        panic(err)
    }

    fmt.Println("Matching logs:", len(data.Logs))
}
