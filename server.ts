/// <reference types="@types/node" />

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFileSync } from "fs";
import { createFincode } from "@fincode/node";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const app = new Hono();
const prisma = new PrismaClient();
const fincode = createFincode({
  apiKey: process.env.API_KEY,
  isLiveMode: false,
});
app.use("/public/*", serveStatic({ root: "./" }));

app.get("/", (c) => {
  const file = readFileSync("./public/index.html", "utf8");
  return c.html(file);
});

// クレジットカード決済
app.post("/api/payment/card", async (c) => {
  try {
    const body: { token: string } = await c.req.json();
    console.log({ body });

    const payment = await fincode.payments.create({
      pay_type: "Card",
      job_code: "CAPTURE",
      amount: "1000",
    });
    console.log({ payment });

    const result = await fincode.payments.execute(payment.id, {
      pay_type: "Card",
      method: "1",
      access_id: payment.access_id,
      token: body.token,
    });
    console.log({ result });

    const paymentTransaction = await prisma.paymentTransaction.create({
      data: {
        amount: 1000,
        orderId: payment.id,
        accessId: result.access_id,
        status: result.status,
        paymentMethod: "Card",
        capturedAt: new Date(),
      },
    });

    const purchase = await prisma.purchase.create({
      data: {
        userId: 2,
        paymentTransactionId: paymentTransaction.id,
        purchasedAt: new Date(),
      },
    });

    return c.json({ paymentTransaction, purchase });
  } catch (error) {
    console.error(error);

    return c.json(error, { status: error.status });
  }
});

serve({
  fetch: app.fetch,
  port: 3000,
});
