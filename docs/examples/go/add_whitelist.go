// Command add_whitelist creates or updates a whitelist record.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const whitelistAdminToken = "<token>"

func main() {
    payload := map[string]string{
        "ip":          "192.168.0.10",
        "description": "VPN gateway",
    }
    body, _ := json.Marshal(payload)

    req, _ := http.NewRequest(http.MethodPost, baseURL+"/settings/whitelist", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+whitelistAdminToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        data, _ := io.ReadAll(resp.Body)
        panic(fmt.Sprintf("unexpected status %d: %s", resp.StatusCode, data))
    }

    var record map[string]any
    if err := json.NewDecoder(resp.Body).Decode(&record); err != nil {
        panic(err)
    }

    fmt.Println("Saved whitelist entry:", record)
}
