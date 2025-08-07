import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Paper,
} from "@mui/material";

const ManualPage: React.FC = () => {
  const { manualType } = useParams<{ manualType: string }>();
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManual = async () => {
      setLoading(true);
      setError(null);
      try {
        let fileName = "";
        switch (manualType) {
          case "admin":
            fileName = "user_manual_admin.html";
            break;
          case "general":
            fileName = "user_manual_general.html";
            break;
          case "viewer":
            fileName = "user_manual_viewer.html";
            break;
          default:
            setError("無効なマニュアルタイプです。");
            setLoading(false);
            return;
        }

        const response = await fetch(`/${fileName}`);
        if (!response.ok) {
          throw new Error(
            `マニュアルの読み込みに失敗しました: ${response.statusText}`
          );
        }
        const text = await response.text();
        setHtmlContent(text);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching manual:", err);
      } finally {
        setLoading(false);
      }
    };

    if (manualType) {
      fetchManual();
    }
  }, [manualType]);

  if (loading) {
    return (
      <Container
        maxWidth="md"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography color="error">
          マニュアルの読み込み中にエラーが発生しました: {error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </Paper>
    </Container>
  );
};

export default ManualPage;
