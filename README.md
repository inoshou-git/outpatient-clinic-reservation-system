# 外来診療予約システム

## 概要

このプロジェクトは、外来診療の予約を管理するためのWebアプリケーションです。患者の予約、スケジュール管理、予約不可時間帯の設定などを直感的に行うことができます。

現在、最新の技術スタックへの移行と機能改善を進めており、より堅牢でスケーラブルなシステムを目指しています。

## 主な機能

- **カレンダーベースの予約管理:** 週次・月次カレンダーで予約状況を視覚的に把握。
- **リアルタイム更新:** 予約やスケジュールの変更が、関係者の画面にリアルタイムで反映されます。
- **柔軟な予約種別:** 「外来診療」「訪問診療」など、複数の予約タイプに対応。
- **予約不可設定:** 祝日や特定の曜日・時間帯を予約不可として一括設定可能。
- **ユーザー管理:** 管理者、一般、閲覧のみなど、役割に応じた権限管理。
- **メール通知:** 新規予約、変更、キャンセル時に、関係者へ自動でメール通知。

## 技術スタック

### **フロントエンド**
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Material-UI](https://mui.com/)

### **バックエンド**
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)

### **データベース & 認証**
- [Supabase](https://supabase.io/)
  - **Database:** [PostgreSQL](https://www.postgresql.org/)
  - **Auth:** JWTベースのユーザー認証

### **インフラ**
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Vercel](https://vercel.com/) （デプロイ先）

## プロジェクトロードマップ

このプロジェクトは現在、`db.json` を利用した初期プロトタイプから、SupabaseとVercelを活用したモダンな構成への移行を進めています。

-   [x] **計画策定:** データベース移行とデプロイ戦略の計画。
-   [ ] **Phase 1: データベースと認証の移行**
    -   [ ] `db.json` からSupabase (PostgreSQL) へのデータ移行。
    -   [ ] Supabase Authを利用した、パスワードのハッシュ化と安全な認証システムの実装。
-   [ ] **Phase 2: フロントエンドとバックエンドの改修**
    -   [ ] 新しい認証フロー（ログイン、ログアウト、パスワードリセット）への対応。
-   [ ] **Phase 3: Vercelへのデプロイ**
    -   [ ] ステージングおよび本番環境の構築。
    -   [ ] GitHubと連携したCI/CDパイプラインの確立。

## 開発環境の構築

### 前提条件
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) がインストールされていること。

### セットアップ手順

1.  **リポジトリのクローン**
    ```bash
    git clone https://github.com/your-username/outpatient-clinic-reservation-system.git
    cd outpatient-clinic-reservation-system
    ```

2.  **環境変数の設定**
    Supabaseプロジェクトのセットアップ後、`backend` と `frontend` の各ディレクトリに `.env` ファイルを作成し、以下の変数を設定します。これらのファイルは `.gitignore` によりリポジトリには含まれません。

    -   **`backend/.env`**
        ```env
        # Supabase
        SUPABASE_URL="YOUR_SUPABASE_URL"
        SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

        # SMTP (メール送信用)
        # 開発環境ではMailHog(http://localhost:8025)が起動します
        SMTP_HOST=mailhog
        SMTP_PORT=1025
        SMTP_USER=""
        SMTP_PASS=""
        SMTP_FROM_ADDRESS="noreply@localhost.dev"

        # System
        SYSTEM_URL="http://localhost:3000"
        ```

    -   **`frontend/.env`**
        ```env
        # Supabase
        REACT_APP_SUPABASE_URL="YOUR_SUPABASE_URL"
        REACT_APP_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
        ```

3.  **Dockerコンテナの起動**
    プロジェクトのルートディレクトリで、以下のコマンドを実行してコンテナをビルドし、起動します。
    ```bash
    docker-compose up --build -d
    ```
    `-d` フラグを外して `docker-compose up --build` を実行すると、ログをリアルタイムで確認できます。

4.  **アプリケーションへのアクセス**
    -   **フロントエンド:** `http://localhost:3000`
    -   **バックエンドAPI:** `http://localhost:3001`
    -   **開発用メールサーバー (MailHog):** `http://localhost:8025`

    **注意:** データベースがSupabaseに移行されるため、ユーザーはSupabase上で管理されます。初回利用時は管理者アカウントなどを手動で作成する必要があります。

## デプロイ

このアプリケーションは[Vercel](https://vercel.com/)へのデプロイを前提としています。デプロイは、特定のブランチへ`git push`することで自動的に実行されます。

-   **本番環境:** `main` ブランチにマージされると、自動的に本番環境へデプロイされます。
-   **ステージング環境:** `develop` ブランチにプッシュされると、プレビュー環境が自動で構築されます。

### デプロイ手順

-   **ステージング環境へのデプロイ（`develop` ブランチを利用）**
    1.  開発ブランチの変更を`develop`ブランチにマージします。
        ```bash
        git checkout develop
        git pull origin develop
        git merge your-feature-branch
        ```
    2.  `develop`ブランチをリモートリポジトリにプッシュすると、Vercelが自動でデプロイを開始します。
        ```bash
        git push origin develop
        ```

-   **本番環境へのデプロイ（`main` ブランチを利用）**
    1.  十分にテストされた`develop`ブランチの内容を`main`ブランチにマージします。
        ```bash
        git checkout main
        git pull origin main
        git merge develop
        ```
    2.  `main`ブランチをリモートリポジトリにプッシュすると、Vercelが自動で本番環境にデプロイします。
        ```bash
        git push origin main
        ```

デプロイに必要な環境変数は、Vercelのプロジェクト設定画面から行います。

## ライセンス

(プロジェクトのライセンス情報を記載)
