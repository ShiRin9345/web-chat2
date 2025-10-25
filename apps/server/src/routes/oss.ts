import express from "express";
import OSS from "ali-oss";
import { config } from "dotenv";

config({ path: ".env.local" });

export const ossRouter = express.Router();

ossRouter.get("/get_sts_token_for_oss_upload", (_req, res) => {
  const sts = new OSS.STS({
    accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET!,
  });
  sts
    .assumeRole(process.env.ALI_OSS_ARN!, ``, 3000, "sessiontest")
    .then((result: any) => {
      res.json({
        AccessKeyId: result.credentials.AccessKeyId,
        AccessKeySecret: result.credentials.AccessKeySecret,
        SecurityToken: result.credentials.SecurityToken,
      });
    })
    .catch((err: any) => {
      console.log(err);
      res.status(400).json(err.message);
    });
});

export default ossRouter;
