-- Expand: tabla nueva para los textos editables de los correos automáticos.
CREATE TABLE "EmailTemplateSetting" (
    "key" TEXT NOT NULL,
    "subject" TEXT,
    "intro" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplateSetting_pkey" PRIMARY KEY ("key")
);
