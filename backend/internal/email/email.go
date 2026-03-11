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

// SendUploadRequest sends a client upload request email asynchronously.
func (c *Client) SendUploadRequest(clientEmail, clientName, merchantName, uploadURL string) {
	if c.apiKey == "" {
		log.Printf("email: skipping upload request (no Resend API key)")
		return
	}

	greeting := "Hi"
	if clientName != "" {
		greeting = fmt.Sprintf("Hi %s", clientName)
	}

	go func() {
		body := sendRequest{
			From:    "BeforeAfter.io <noreply@beforeafter.io>",
			To:      []string{clientEmail},
			Subject: fmt.Sprintf("%s has requested your photos", merchantName),
			HTML: fmt.Sprintf(
				`<h2>%s,</h2>
<p><strong>%s</strong> would like you to share your before & after photos.</p>
<p>Click the link below to upload your photos:</p>
<p><a href="%s" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;">Upload Photos</a></p>
<p style="color:#666;font-size:14px;">This link expires in 7 days.</p>`,
				greeting, merchantName, uploadURL),
		}
		c.send(body, "upload request", clientEmail)
	}()
}

// SendUploadReminder sends a reminder to upload photos.
func (c *Client) SendUploadReminder(clientEmail, clientName, merchantName, uploadURL string) {
	if c.apiKey == "" {
		log.Printf("email: skipping upload reminder (no Resend API key)")
		return
	}

	greeting := "Hi"
	if clientName != "" {
		greeting = fmt.Sprintf("Hi %s", clientName)
	}

	go func() {
		body := sendRequest{
			From:    "BeforeAfter.io <noreply@beforeafter.io>",
			To:      []string{clientEmail},
			Subject: fmt.Sprintf("Reminder: %s is waiting for your photos", merchantName),
			HTML: fmt.Sprintf(
				`<h2>%s,</h2>
<p>Just a friendly reminder — <strong>%s</strong> is still waiting for your before & after photos.</p>
<p><a href="%s" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;">Upload Photos</a></p>`,
				greeting, merchantName, uploadURL),
		}
		c.send(body, "upload reminder", clientEmail)
	}()
}

// SendUploadThankYou sends a thank you email after photo submission.
func (c *Client) SendUploadThankYou(clientEmail, clientName string) {
	if c.apiKey == "" {
		log.Printf("email: skipping upload thank you (no Resend API key)")
		return
	}

	greeting := "Hi"
	if clientName != "" {
		greeting = fmt.Sprintf("Hi %s", clientName)
	}

	go func() {
		body := sendRequest{
			From:    "BeforeAfter.io <noreply@beforeafter.io>",
			To:      []string{clientEmail},
			Subject: "Thank you for your photos!",
			HTML: fmt.Sprintf(
				`<h2>%s,</h2>
<p>Thank you for uploading your photos! They are now being reviewed.</p>
<p style="color:#666;font-size:14px;">Powered by BeforeAfter.io</p>`,
				greeting),
		}
		c.send(body, "upload thank you", clientEmail)
	}()
}

// SendNewLeadNotification notifies a merchant about a new lead.
func (c *Client) SendNewLeadNotification(merchantEmail, leadName, leadType, dashboardURL string) {
	if c.apiKey == "" {
		log.Printf("email: skipping lead notification (no Resend API key)")
		return
	}

	typeLabel := "contact inquiry"
	if leadType == "booking" {
		typeLabel = "booking request"
	}

	go func() {
		body := sendRequest{
			From:    "BeforeAfter.io <noreply@beforeafter.io>",
			To:      []string{merchantEmail},
			Subject: fmt.Sprintf("New %s from %s", typeLabel, leadName),
			HTML: fmt.Sprintf(
				`<h2>New %s!</h2>
<p><strong>%s</strong> has submitted a %s through your BeforeAfter.io page.</p>
<p><a href="%s" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;">View in Dashboard</a></p>`,
				typeLabel, leadName, typeLabel, dashboardURL),
		}
		c.send(body, "lead notification", merchantEmail)
	}()
}

// SendTenantInvite sends a workspace invitation email asynchronously via Resend.
func (c *Client) SendTenantInvite(toEmail, inviterName, tenantName, acceptURL string) {
	if c.apiKey == "" {
		log.Printf("email: skipping tenant invite (no Resend API key)")
		return
	}

	go func() {
		body := sendRequest{
			From:    "BeforeAfter.io <noreply@beforeafter.io>",
			To:      []string{toEmail},
			Subject: fmt.Sprintf("%s invited you to %s on BeforeAfter.io", inviterName, tenantName),
			HTML: fmt.Sprintf(
				`<h2>You've been invited!</h2>
<p><strong>%s</strong> has invited you to join <strong>%s</strong> on BeforeAfter.io.</p>
<p>Click the link below to accept the invitation:</p>
<p><a href="%s" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;">Accept Invitation</a></p>
<p style="color:#666;font-size:14px;">This invitation expires in 7 days.</p>`,
				inviterName, tenantName, acceptURL),
		}
		c.send(body, "tenant invite", toEmail)
	}()
}

// send is a helper that sends an email via Resend API.
func (c *Client) send(body sendRequest, emailType, recipient string) {
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
		log.Printf("email: failed to send %s to %s: %v", emailType, recipient, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("email: Resend API returned %d for %s to %s", resp.StatusCode, emailType, recipient)
	}
}
