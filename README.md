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

- ユーザー認証（ログイン、新規登録）
- 予約の追加、更新、削除
- 予約不可時間帯の設定
- ユーザー管理（管理者権限）
- メール通知機能（予約、予約不可設定の変更時）

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
        # SMTPサーバーの設定 (Mailtrapなどのテスト用SMTPサービスを推奨)
        SMTP_HOST=smtp.mailtrap.io
        SMTP_PORT=2525
        SMTP_USER=YOUR_MAILTRAP_USERNAME
        SMTP_PASS=YOUR_MAILTRAP_PASSWORD
        # システムのURL (フロントエンドのURLと合わせる)
        SYSTEM_URL=http://localhost:3333
        ```
        `YOUR_MAILTRAP_USERNAME` と `YOUR_MAILTRAP_PASSWORD` は、[Mailtrap](https://mailtrap.io/) などで取得した実際の情報に置き換えてください。

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

    ログイン後、管理者アカウントで「ユーザー管理」画面から各ユーザーのメールアドレスを設定してください。予約や予約不可設定の変更時にメールが送信されると、バックエンドのDockerログにEthereal.emailのプレビューURLが表示されます。

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
