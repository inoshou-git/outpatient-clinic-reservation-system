# 外来診療予約システム

このプロジェクトは、外来診療の予約を管理するためのシステムです。バックエンドはNode.js (Express) と JSONファイルベースの簡易データベース、フロントエンドはReactで構築されています。Docker Compose を使用して、簡単に開発環境を構築・実行できます。

## 目次

- [機能](#機能)
- [技術スタック](#技術スタック)
- [開発環境の構築](#開発環境の構築)
  - [前提条件](#前提条件)
  - [セットアップ手順](#セットアップ手順)
- [本番環境でのデプロイ](#本番環境でのデプロイ)
- [メール通知機能について](#メール通知機能について)
- [APIドキュメント](#apiドキュメント)
- [貢献](#貢献)
- [ライセンス](#ライセンス)

## 機能

- **管理者によるユーザー作成:**
  - 管理者権限を持つユーザーのみが新しいユーザーを作成できます。
  - 新規ユーザーには自動生成された初期パスワードが割り当てられ、指定されたメールアドレスに通知されます。
  - 初回ログイン時にパスワードの変更が強制されます。
- 予約の追加、更新、削除
  - 予約更新時には、変更された項目がメール通知に明記されます（例: 日時: 2025-08-01 11:00 → 2025-08-01 10:30）。
  - 予約操作中にローディングインジケーターが表示され、ユーザー体験が向上しました。
- 予約不可時間帯の設定
  - 予約不可設定の変更中にローディングインジケーターが表示され、ユーザー体験が向上しました。
- ユーザー管理（管理者権限）
  - ユーザーの作成、更新、削除操作中にローディングインジケーターが表示され、ユーザー体験が向上しました。
  - 閲覧ユーザーには「一括操作」ボタンが表示されません。
- メール通知機能（予約、予約不可設定の変更時、新規ユーザー作成時）
- `patientId` の数字のみバリデーション（フロントエンド・バックエンド両方）

## 技術スタック

- **バックエンド:** Node.js, Express.js, TypeScript, `date-fns`, `nodemailer`
- **フロントエンド:** React, TypeScript, Material-UI, `dayjs`, `react-router-dom`
- **データベース:** JSONファイル (db.json)
- **コンテナ化:** Docker, Docker Compose

## 開発環境の構築

### 前提条件

- Docker Desktop (Docker Engine と Docker Compose を含む) がインストールされていること。

### セットアップ手順

1.  **リポジトリのクローン**

    ```bash
    git clone https://github.com/your-username/outpatient-clinic-reservation-system.git
    cd outpatient-clinic-reservation-system
    ```

2.  **環境変数の設定**

    プロジェクトのルートディレクトリに移動し、`backend` と `frontend` ディレクトリ内にそれぞれ `.env` ファイルを作成します。

    -   **`backend/.env`**
        ```env
        # SMTPサーバーの設定 (Gmail, Yahoo!メールなどの実際のSMTPサービス、またはテスト用SMTPサービスを推奨)
        # Gmailの場合:
        # SMTP_HOST=smtp.gmail.com
        # SMTP_PORT=465
        # SMTP_USER=あなたのGmailアドレス@gmail.com
        # SMTP_PASS=あなたのGmailアプリパスワード (通常のパスワードではありません)
        #
        # Yahoo!メールの場合:
        # SMTP_HOST=smtp.mail.yahoo.co.jp
        # SMTP_PORT=465
        # SMTP_USER=あなたのYahooメールアドレス@yahoo.co.jp
        # SMTP_PASS=あなたのYahooメールアプリパスワード (通常のパスワードではありません)
        #
        # テスト用SMTPサービス (例: Ethereal.email) の場合:
        # SMTP_HOST=smtp.ethereal.email
        # SMTP_PORT=587 # または465
        # SMTP_USER=your_ethereal_username
        # SMTP_PASS=your_ethereal_password

        # システムのURL (フロントエンドのURLと合わせる)
        SYSTEM_URL=http://localhost:3333
        ```
        `SMTP_USER` と `SMTP_PASS` は、ご利用のメールサービスで生成した**アプリパスワード**に置き換えてください。GmailやYahoo!メールでは、通常のログインパスワードは使用できません。

    -   **`frontend/.env`**
        ```env
        # バックエンドAPIのベースURL
        REACT_APP_API_BASE_URL=http://localhost:3334
        ```

3.  **Docker Compose の実行**

    プロジェクトのルートディレクトリで、以下のコマンドを実行してコンテナをビルドし、起動します。

    ```bash
    docker compose up -d --build
    ```

    -   `docker compose up`: `docker-compose.yml` に基づいてサービスを起動します。
    -   `-d`: バックグラウンドでコンテナを実行します。
    -   `--build`: イメージが存在しない場合や、Dockerfile が変更された場合にイメージを再ビルドします。

4.  **アプリケーションへのアクセス**

    コンテナが正常に起動したら、以下のURLでアプリケーションにアクセスできます。

    -   **フロントエンド:** `http://localhost:3333`
    -   **バックエンドAPI:** `http://localhost:3334`

    **初期ユーザー情報:**
    `backend/db.json` に以下の初期ユーザーが登録されています。

    -   **管理者:**
        -   ユーザーID: `admin`
        -   パスワード: `password`
    -   **一般ユーザー:**
        -   ユーザーID: `user1`
        -   パスワード: `user1`
    -   **閲覧ユーザー:**
        -   ユーザーID: `user2`
        -   パスワード: `user2`

    **重要:**
    ログイン後、管理者アカウントで「ユーザー管理」画面から新しいユーザーを作成し、メールアドレスを設定してください。新規ユーザー作成時、予約や予約不可設定の変更時にメールが送信されます。バックエンドのDockerログにEthereal.emailのプレビューURLが表示されるか、設定したメールアドレスに実際にメールが届くか確認してください。

    ```bash
    docker logs outpatient-clinic-reservation-system-backend-1
    ```

## 本番環境でのデプロイ

本番環境では、開発環境とは異なる環境変数を使用することを推奨します。

1.  **本番用 `.env` ファイルの作成**

    `backend` と `frontend` ディレクトリ内に、それぞれ `backend/.env.production` と `frontend/.env.production` ファイルを作成します。

    -   **`backend/.env.production`**
        ```env
        # 実際のSMTPサーバーの設定
        SMTP_HOST=your_production_smtp_host
        SMTP_PORT=your_production_smtp_port
        SMTP_USER=your_production_smtp_user
        SMTP_PASS=your_production_smtp_pass
        # 本番環境のシステムのURL
        SYSTEM_URL=https://your.production.url
        ```

    -   **`frontend/.env.production`**
        ```env
        # 本番環境のバックエンドAPIのベースURL
        REACT_APP_API_BASE_URL=https://your.production.url:3334
        ```

2.  **本番環境用 Docker Compose の実行**

    以下のコマンドを実行して、本番環境用のコンテナをビルドし、起動します。

    ```bash
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    ```

    これにより、`docker-compose.yml` の設定に加えて、`docker-compose.prod.yml` で定義された設定（特に `env_file`）が適用されます。

## メール通知機能について

-   メール送信には `nodemailer` を使用しています。
-   開発環境では、`Ethereal.email` を利用して実際のメール送信なしにメールの内容を確認できます。バックエンドのログに出力されるURLを確認してください。
-   本番環境で実際にメールを送信するには、`backend/.env.production` に実際のSMTPサーバーの認証情報を設定する必要があります。

## APIドキュメント

(ここにAPIドキュメントへのリンクや、主要なエンドポイントの概要を記載できます)

## 貢献

(貢献に関するガイドラインや、コントリビューターのリストを記載できます)

## ライセンス

(プロジェクトのライセンス情報を記載できます)