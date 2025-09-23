// Command delete_logs removes logs that match the provided filter.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
)

const (
    deleteToken = "<token>"
    deleteProjectUUID = "<project-uuid>"
)

func main() {
    params := url.Values{}
    params.Set("level", "DEBUG")

    req, _ := http.NewRequest(http.MethodDelete, baseURL+"/logs/"+deleteProjectUUID+"?"+params.Encode(), nil)
    req.Header.Set("Authorization", "Bearer "+deleteToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var result struct {
        Deleted int `json:"deleted"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        panic(err)
    }

    fmt.Println("Deleted logs:", result.Deleted)
}
