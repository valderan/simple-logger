// Command list_whitelist fetches every whitelist record.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

const whitelistToken = "<token>"

func main() {
    req, _ := http.NewRequest(http.MethodGet, baseURL+"/settings/whitelist", nil)
    req.Header.Set("Authorization", "Bearer "+whitelistToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var records []struct {
        IP          string `json:"ip"`
        Description string `json:"description"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&records); err != nil {
        panic(err)
    }

    for _, record := range records {
        desc := record.Description
        if desc == "" {
            desc = "no description"
        }
        fmt.Printf("%s -> %s\n", record.IP, desc)
    }
}
