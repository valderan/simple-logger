import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';

const pythonLoginExample = `"""Authenticate against the Simple Logger API using the requests library."""

import requests

BASE_URL = "http://localhost:3000/api"


def login(username: str, password: str) -> str:
    """Perform POST /api/auth/login and return the received token."""

    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    response.raise_for_status()
    token = response.json()["token"]
    print("Received token:", token)
    return token


if __name__ == "__main__":
    login("admin", "secret")`;

const typescriptCreateProjectExample = `import { LoggerApiClient } from './loggerClient';

/**
 * Creates a new logging project and prints its UUID.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api' });
  client.setToken('<paste token from login example>');

  try {
    const project = await client.createProject({
      name: 'Orders Service',
      description: 'Handles order processing events',
      logFormat: { level: 'string', message: 'string', timestamp: 'ISO8601' },
      customTags: ['PAYMENT', 'SHIPPING'],
      telegramNotify: {
        enabled: true,
        recipients: [{ chatId: '123456', tags: ['ERROR', 'CRITICAL'] }],
        antiSpamInterval: 30
      },
      debugMode: false
    });

    console.log('Created project UUID:', project.uuid);
  } catch (error) {
    console.error('Failed to create project:', error);
  }
}

void main();`;

const goIngestLogExample = `// Command ingest_log demonstrates how services can push logs to the collector.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const projectUUIDForLogs = "<project-uuid>"

func main() {
    payload := map[string]any{
        "uuid": projectUUIDForLogs,
        "log": map[string]any{
            "level":   "ERROR",
            "message": "Payment gateway returned non-200 response",
            "tags":    []string{"PAYMENT"},
            "metadata": map[string]any{
                "service": "billing-service",
                "user":    "user-42",
                "ip":      "10.0.0.12",
                "extra":   map[string]any{"orderId": "A-42"},
            },
        },
    }

    body, _ := json.Marshal(payload)
    resp, err := http.Post(baseURL+"/logs", "application/json", bytes.NewReader(body))
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        data, _ := io.ReadAll(resp.Body)
        panic(fmt.Sprintf("unexpected status %d: %s", resp.StatusCode, data))
    }

    var logEntry struct {
        ID string \`json:"_id"\`
    }
    if err := json.NewDecoder(resp.Body).Decode(&logEntry); err != nil {
        panic(err)
    }

    fmt.Println("Stored log ID:", logEntry.ID)
}`;

const bashWhitelistExample = `#!/usr/bin/env bash
# Add an IP address to the whitelist.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
TOKEN="<token>"

curl -sS -X POST "\${BASE_URL}/settings/whitelist" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer \${TOKEN}" \
  -d '{"ip": "192.168.0.10", "description": "VPN gateway"}' | jq`;

const helpSectionKeys = ['dashboard', 'projects', 'addProject', 'logs', 'ping', 'telegram', 'settings', 'faq'] as const;
const addProjectKeys = [
  'name',
  'description',
  'logFormat',
  'defaultTags',
  'customTags',
  'accessLevel',
  'telegramNotify',
  'antiSpam',
  'recipients',
  'debugMode'
] as const;

const environmentKeys = ['apiUrl', 'loggerPageUrl', 'loggerVersion', 'botApiKey', 'jwtSecret', 'mongoUri'] as const;

const apiExamples = [
  { titleKey: 'faq.apiExamples.login', language: 'Python', code: pythonLoginExample },
  { titleKey: 'faq.apiExamples.createProject', language: 'TypeScript', code: typescriptCreateProjectExample },
  { titleKey: 'faq.apiExamples.ingestLog', language: 'Go', code: goIngestLogExample },
  { titleKey: 'faq.apiExamples.whitelist', language: 'Bash', code: bashWhitelistExample }
] as const;

export const FAQPage = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('faq.title')}
        </Typography>
        <Typography color="text.secondary">{t('faq.intro')}</Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('faq.helpSection.title')}
            </Typography>
            <Stack spacing={1.5}>
              {helpSectionKeys.map((key) => (
                <Typography key={key} variant="body1">
                  {t(`faq.helpSection.${key}`)}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('faq.addProjectDetails.title')}
            </Typography>
            <Stack spacing={1.5}>
              {addProjectKeys.map((key) => (
                <Typography key={key} variant="body1">
                  {t(`faq.addProjectDetails.${key}`)}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('faq.apiExamples.title')}
            </Typography>
            <Typography color="text.secondary">{t('faq.apiExamples.description')}</Typography>
            <Stack spacing={3}>
              {apiExamples.map((example) => (
                <Box key={example.titleKey}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {t(example.titleKey)} ({example.language})
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      p: 2,
                      borderRadius: 2,
                      overflow: 'auto'
                    }}
                  >
                    <code>{example.code}</code>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('faq.environment.title')}
            </Typography>
            <Typography color="text.secondary">{t('faq.environment.description')}</Typography>
            <Stack spacing={1}>
              {environmentKeys.map((key) => (
                <Typography key={key} variant="body1">
                  {t(`faq.environment.${key}`)}
                </Typography>
              ))}
            </Stack>
            <Alert severity="info">{t('faq.helpSection.faq')}</Alert>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
