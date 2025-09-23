// Command get_project_logs fetches logs for a specific project.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
)

const (
    projectToken = "<token>"
    projectUUID  = "<project-uuid>"
)

func main() {
    params := url.Values{}
    params.Set("level", "ERROR")
    params.Set("startDate", "2024-05-01T00:00:00.000Z")

    req, _ := http.NewRequest(http.MethodGet, baseURL+"/projects/"+projectUUID+"/logs?"+params.Encode(), nil)
    req.Header.Set("Authorization", "Bearer "+projectToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var data struct {
        Project struct {
            Name string `json:"name"`
        } `json:"project"`
        Logs []struct {
            Level   string `json:"level"`
            Message string `json:"message"`
        } `json:"logs"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        panic(err)
    }

    fmt.Println("Project:", data.Project.Name, "logs returned:", len(data.Logs))
}
