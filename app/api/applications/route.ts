import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/app/generated/prisma/client";

const validStatuses = new Set(Object.values(ApplicationStatus));

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      include: { company: true, interviews: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, applications });
  } catch (error) {
    console.error("GET applications:", error);
    return NextResponse.json({ success: false, error: "Unable to load applications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const companyName = typeof input.companyName === "string" ? input.companyName.trim() : "";
    const jobTitle = typeof input.jobTitle === "string" ? input.jobTitle.trim() : "";
    const location = input.location == null || input.location === "" ? null : input.location;
    const status = input.status ?? "APPLIED";
    if (!companyName || !jobTitle || companyName.length > 100 || jobTitle.length > 150 ||
        (location !== null && (typeof location !== "string" || location.length > 150)) ||
        typeof status !== "string" || !validStatuses.has(status as ApplicationStatus)) {
      return NextResponse.json({ success: false, error: "Please enter valid company, role, location and status." }, { status: 400 });
    }
    const application = await prisma.application.create({
      data: {
        jobTitle,
        location: location as string | null,
        status: status as ApplicationStatus,
        company: { create: { name: companyName } },
      },
      include: { company: true, interviews: true },
    });
    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch (error) {
    console.error("POST applications:", error);
    return NextResponse.json({ success: false, error: "Unable to create application" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.id !== "string" || !input.id || typeof input.status !== "string" ||
        !validStatuses.has(input.status as ApplicationStatus)) {
      return NextResponse.json({ success: false, error: "Invalid application ID or status" }, { status: 400 });
    }
    const application = await prisma.application.update({
      where: { id: input.id },
      data: { status: input.status as ApplicationStatus },
      include: { company: true, interviews: true },
    });
    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("PATCH applications:", error);
    return NextResponse.json({ success: false, error: "Unable to update application" }, { status: 500 });
  }
}
