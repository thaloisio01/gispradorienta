# Configuração Firebase (OrientaHub)

## 1) Criar Firestore
1. Abra: https://console.firebase.google.com
2. Entre no projeto `orientahub-47a39`
3. Vá em **Build > Firestore Database**
4. Clique em **Create database**
5. Selecione **Start in test mode**
6. Finalize a criação

## 2) Publicar regras
1. Em Firestore, abra a aba **Rules**
2. Copie o conteúdo de `firestore.rules.txt`
3. Cole no editor de regras
4. Clique em **Publish**

## 3) Validar configuração web
No arquivo `app.js`, confira se `firebaseConfig` está preenchido com:
- apiKey
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId
- measurementId (opcional)

## 4) Publicar no GitHub
Suba estes arquivos:
- index.html
- app.js
- styles.css
- FIREBASE_SETUP.md
- firestore.rules.txt

Depois aguarde 1-2 minutos e teste no link do GitHub Pages.
