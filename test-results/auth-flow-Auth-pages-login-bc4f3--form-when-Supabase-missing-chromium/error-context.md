# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - paragraph [ref=e5]: KapGel
        - heading "Giriş Yap" [level=1] [ref=e6]
        - paragraph [ref=e7]:
          - text: Hesabın yok mu?
          - link "Kayıt Ol" [ref=e8] [cursor=pointer]:
            - /url: /register
      - form "Giriş formu" [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: E-posta
          - textbox "E-posta" [ref=e12]
        - generic [ref=e13]:
          - generic [ref=e14]: Şifre
          - textbox "Şifre" [ref=e15]
        - button "Giriş Yap" [ref=e16]
  - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
    - img [ref=e23] [cursor=pointer]
  - alert [ref=e26]
```