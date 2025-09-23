// Command login demonstrates how to authenticate against the Simple Logger API using Go.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const baseURL = "http://localhost:3000/api"

func main() {
    body, _ := json.Marshal(map[string]string{
        "username": "admin",
        "password": "secret",
    })

    resp, err := http.Post(baseURL+"/auth/login", "application/json", bytes.NewReader(body))
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        data, _ := io.ReadAll(resp.Body)
        panic(fmt.Sprintf("unexpected status %d: %s", resp.StatusCode, data))
    }

    var result struct {
        Token string `json:"token"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        panic(err)
    }

    fmt.Println("Received token:", result.Token)
}
