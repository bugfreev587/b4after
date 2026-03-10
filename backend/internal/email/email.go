package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Client struct {
	apiKey string
}

func NewClient(apiKey string) *Client {
	return &Client{apiKey: apiKey}
}

type sendRequest struct {
	From    string `json:"from"`
	To      []string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

// SendTeamInvite sends an invitation email asynchronously via Resend.
func (c *Client) SendTeamInvite(inviteeEmail, ownerName, dashboardURL string) {
	if c.apiKey == "" {
		log.Printf("email: skipping team invite (no Resend API key)")
		return
	}

	go func() {
		body := sendRequest{
			From:    "BeforeAfter.io <noreply@beforeafter.io>",
			To:      []string{inviteeEmail},
			Subject: fmt.Sprintf("%s invited you to their team on BeforeAfter.io", ownerName),
			HTML: fmt.Sprintf(
				`<h2>You've been invited!</h2>
<p><strong>%s</strong> has added you to their team on BeforeAfter.io.</p>
<p>You now have access to their comparisons and galleries.</p>
<p><a href="%s">Go to Dashboard</a></p>`,
				ownerName, dashboardURL),
		}

		jsonBody, err := json.Marshal(body)
		if err != nil {
			log.Printf("email: failed to marshal request: %v", err)
			return
		}

		req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(jsonBody))
		if err != nil {
			log.Printf("email: failed to create request: %v", err)
			return
		}
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Printf("email: failed to send team invite to %s: %v", inviteeEmail, err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			log.Printf("email: Resend API returned %d for team invite to %s", resp.StatusCode, inviteeEmail)
		}
	}()
}
