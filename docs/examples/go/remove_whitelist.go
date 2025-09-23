// Command remove_whitelist deletes an IP from the whitelist.
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

const whitelistRemovalToken = "<token>"

func main() {
    req, _ := http.NewRequest(http.MethodDelete, baseURL+"/settings/whitelist/192.168.0.10", nil)
    req.Header.Set("Authorization", "Bearer "+whitelistRemovalToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        panic(fmt.Sprintf("unexpected status: %d", resp.StatusCode))
    }

    var result struct {
        Success bool `json:"success"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        panic(err)
    }

    fmt.Println("Removal status:", result.Success)
}
