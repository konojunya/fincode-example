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
app.post("/", (c) => {
  const file = readFileSync("./public/index.html", "utf8");
  return c.html(file);
});

// クレカ登録
// https://docs.fincode.jp/payment/fraud_protection/3d_secure_2
app.post("/api/payment/card", async (c) => {
  try {
    const body: { token: string } = await c.req.json();
    const result = await fetch(
      "https://api.test.fincode.jp/v1/customers/vqVgwNvnayNX17vyxn84I78xm6g1/payment_methods",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pay_type: "Card",
          default_flag: "1",
          return_url: "http://localhost:3000?3ds=success",
          return_url_on_failure: "http://localhost:3000?3ds=failure",
          card: {
            token: body.token,
            tds_type: "2",
            tds2_type: "3",
            td_tenant_name: "TEST SHOP",
          },
        }),
      },
    );

    const response = await result.json();
    console.log(response);

    return c.json({ redirect_url: response.redirect_url });
  } catch (error) {
    console.error(error);

    return c.json(error, { status: error.status });
  }
});

app.get("/api/payment/card", async (c) => {
  try {
    const result = await fincode.cards.retrieveList(
      "vqVgwNvnayNX17vyxn84I78xm6g1",
    );

    console.log(result);

    return c.json(result);
  } catch (error) {
    console.error(error);

    return c.json(error, { status: error.status });
  }
});

// 決済実行
app.post("/api/payment/purchase", async (c) => {
  const body: { cardId: string } = await c.req.json();
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
    card_id: body.cardId,
    customer_id: "vqVgwNvnayNX17vyxn84I78xm6g1",
    tds2_ret_url: `https://api.test.fincode.jp/v1/payment_methods/cards/${body.cardId}/3ds_receive`,
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
      userId: 1,
      paymentTransactionId: paymentTransaction.id,
      purchasedAt: new Date(),
    },
  });

  return c.json({ paymentTransaction, purchase });
});

// クレジットカード決済
// app.post("/api/payment/card", async (c) => {
//   try {
//     const body: { token: string } = await c.req.json();
//     console.log({ body });
//
//     const payment = await fincode.payments.create({
//       pay_type: "Card",
//       job_code: "CAPTURE",
//       amount: "1000",
//     });
//     console.log({ payment });
//
//     const result = await fincode.payments.execute(payment.id, {
//       pay_type: "Card",
//       method: "1",
//       access_id: payment.access_id,
//       token: body.token,
//     });
//     console.log({ result });
//
//     const paymentTransaction = await prisma.paymentTransaction.create({
//       data: {
//         amount: 1000,
//         orderId: payment.id,
//         accessId: result.access_id,
//         status: result.status,
//         paymentMethod: "Card",
//         capturedAt: new Date(),
//       },
//     });
//
//     const purchase = await prisma.purchase.create({
//       data: {
//         userId: 2,
//         paymentTransactionId: paymentTransaction.id,
//         purchasedAt: new Date(),
//       },
//     });
//
//     return c.json({ paymentTransaction, purchase });
//   } catch (error) {
//     console.error(error);
//
//     return c.json(error, { status: error.status });
//   }
// });

serve({
  fetch: app.fetch,
  port: 3000,
});
