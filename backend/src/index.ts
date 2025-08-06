import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './users/users.routes';
import appointmentsRouter from './appointments/appointments.routes';
import blockedSlotsRouter from './blocked-slots/blocked-slots.routes';


dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', usersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/blocked-slots', blockedSlotsRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});
