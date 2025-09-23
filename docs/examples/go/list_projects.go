// Command list_projects fetches all projects from the logger.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

const token = "<token>"

func main() {
    req, _ := http.NewRequest(http.MethodGet, baseURL+"/projects", nil)
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var projects []struct {
        UUID string `json:"uuid"`
        Name string `json:"name"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&projects); err != nil {
        panic(err)
    }

    for _, project := range projects {
        fmt.Printf("%s -> %s\n", project.UUID, project.Name)
    }
}
