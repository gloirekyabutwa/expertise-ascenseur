# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Sign in
      - generic [ref=e7]: Enter your credentials and tenant ID to access the platform.
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: Tenant ID
        - textbox "Tenant ID" [ref=e11]:
          - /placeholder: uuid...
          - text: 7327c495-606c-45c4-8896-416dd6a46367
      - generic [ref=e12]:
        - text: Email
        - textbox "Email" [ref=e13]:
          - /placeholder: admin@example.com
          - text: admin@ascenseurs-express.com
      - generic [ref=e14]:
        - text: Password
        - textbox "Password" [ref=e15]: admin123
      - button "Sign in" [ref=e16] [cursor=pointer]
  - region "Notifications alt+T"
  - alert [ref=e17]
```