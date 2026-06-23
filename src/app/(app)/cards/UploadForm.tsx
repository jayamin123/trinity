"use client";
import { Button, Box, Stack, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useState } from "react";
import { uploadCsv } from "./actions";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    const fd = new FormData();
    fd.append("file", file);
    await uploadCsv(fd);
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
        >
          Choose file
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        {file && (
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2">{file.name}</Typography>
            <Typography variant="caption" color="text.secondary">{(file.size / 1024).toFixed(1)} KB</Typography>
          </Box>
        )}
        <Button type="submit" variant="contained" disabled={!file || pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </Stack>
    </form>
  );
}
