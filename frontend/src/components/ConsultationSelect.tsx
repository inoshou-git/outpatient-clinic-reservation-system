import React, { useState } from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  TextField,
} from '@mui/material';



// 全ての診察内容のマスターリスト
export const allConsultationOptions = [
  "VF",
  "生活習慣",
  "入職時健診",
  "健康診断",
  "企業健診",
  "特定健診",
  "帯状疱疹(生ワクチン)",
  "帯状疱疹(シングリックス1回目)",
  "帯状疱疹(シングリックス2回目)",
  "コロナ",
  "肺炎球菌",
  "インフルエンザ",
  "定期処方",
  "整形",
  "採血のみ",
  "新患",
];

// 一括更新用のリスト
export const bulkUpdateConsultationOptions = allConsultationOptions;

interface ConsultationSelectProps {
  consultation: string[];
  setConsultation: (value: string[]) => void;
  setHasUserInteracted: (value: boolean) => void;
}

const ConsultationSelect: React.FC<ConsultationSelectProps> = ({
  consultation,
  setConsultation,
  setHasUserInteracted,
}) => {
  const [consultationSelectOpen, setConsultationSelectOpen] = useState(false);

  return (
    <>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="consultation-label">診察内容</InputLabel>
        <Select
          labelId="consultation-label"
          id="consultation-select"
          name="consultation"
          multiple
          value={consultation}
          label="診察内容"
          open={consultationSelectOpen}
          onOpen={() => setConsultationSelectOpen(true)}
          onClose={() => setConsultationSelectOpen(false)}
          onChange={(e: SelectChangeEvent<typeof consultation>) => {
            setConsultation(e.target.value as string[]);
            setHasUserInteracted(true);
          }}
          renderValue={(selected) => (Array.isArray(selected) ? selected.join(', ') : selected)}
        >
          {allConsultationOptions.map((option) => (
            <MenuItem key={option} value={option}>
              <Checkbox checked={consultation.indexOf(option) > -1} />
              <ListItemText primary={option} />
            </MenuItem>
          ))}
          <Box sx={{ position: 'sticky', bottom: 0, background: 'white', p: 1, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #ddd' }}>
            <Button size="small" onClick={() => setConsultationSelectOpen(false)}>閉じる</Button>
          </Box>
        </Select>
      </FormControl>
    </>
  );
};

export default ConsultationSelect;
