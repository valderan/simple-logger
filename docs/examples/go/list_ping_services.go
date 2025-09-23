// Command list_ping_services lists ping checks configured for a project.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

const (
    pingListToken = "<token>"
    pingListProjectUUID = "<project-uuid>"
)

func main() {
    req, _ := http.NewRequest(http.MethodGet, baseURL+"/projects/"+pingListProjectUUID+"/ping-services", nil)
    req.Header.Set("Authorization", "Bearer "+pingListToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var services []struct {
        Name     string `json:"name"`
        URL      string `json:"url"`
        Interval int    `json:"interval"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&services); err != nil {
        panic(err)
    }

    for _, service := range services {
        fmt.Printf("%s -> %s (interval %ds)\n", service.Name, service.URL, service.Interval)
    }
}
