import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { trainingDaysRouter } from "./routes/trainingDays";
import { sessionsRouter } from "./routes/sessions";
import { buddiesRouter } from "./routes/buddies";
import { exercisesRouter } from "./routes/exercises";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "gymeasure-api" });
});

app.use("/auth", authRouter);
app.use("/training-days", trainingDaysRouter);
app.use("/sessions", sessionsRouter);
app.use("/buddies", buddiesRouter);
app.use("/exercises", exercisesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Gymeasure API listening on :${port}`);
});
