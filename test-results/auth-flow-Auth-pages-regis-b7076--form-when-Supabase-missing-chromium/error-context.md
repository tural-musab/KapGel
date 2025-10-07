# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - paragraph [ref=e5]: KapGel
        - heading "Kayıt Ol" [level=1] [ref=e6]
        - paragraph [ref=e7]:
          - text: Zaten hesabın var mı?
          - link "Giriş Yap" [ref=e8] [cursor=pointer]:
            - /url: /login
      - form "Kayıt formu" [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: Ad Soyad
          - textbox "Ad Soyad" [ref=e12]
        - generic [ref=e13]:
          - generic [ref=e14]: E-posta
          - textbox "E-posta" [ref=e15]
        - generic [ref=e16]:
          - generic [ref=e17]: Şifre
          - textbox "Şifre" [ref=e18]
        - button "Kayıt Ol" [ref=e19]
  - button "Open Next.js Dev Tools" [ref=e25] [cursor=pointer]:
    - img [ref=e26] [cursor=pointer]
  - alert [ref=e29]
```