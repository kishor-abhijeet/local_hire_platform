import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

function parseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function canManageJob(user, job) {
  return user.role === "admin" || job.employerId.toString() === user._id.toString();
}

export async function getJobs(req, res, next) {
  try {
    const {
      keyword,
      city,
      category,
      jobType,
      minSalary,
      maxSalary,
      experience,
      page = 1,
      limit = 6
    } = req.query;

    const filter = { status: "active", isFilled: false };

    if (keyword) {
      filter.$text = { $search: keyword };
    }
    if (city) filter.city = city;
    if (category) filter.category = category;
    if (jobType) filter.jobType = jobType;
    if (experience) filter.experienceRequired = experience;
    if (minSalary || maxSalary) {
      filter.salaryMin = {};
      if (minSalary) filter.salaryMin.$gte = Number(minSalary);
      if (maxSalary) filter.salaryMin.$lte = Number(maxSalary);
    }

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * pageSize;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("employerId", "name isVerifiedEmployer")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Job.countDocuments(filter)
    ]);

    res.json({
      jobs,
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize) || 1,
      total
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeaturedJobs(req, res, next) {
  try {
    const jobs = await Job.find({ status: "active", isFilled: false })
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({ jobs });
  } catch (error) {
    next(error);
  }
}

export async function getJobById(req, res, next) {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("employerId", "name email isVerifiedEmployer");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ job });
  } catch (error) {
    next(error);
  }
}

export async function createJob(req, res, next) {
  try {
    const requiredFields = [
      "title",
      "company",
      "salaryMin",
      "city",
      "category",
      "jobType",
      "experienceRequired",
      "description",
      "phoneNumber"
    ];

    const missing = requiredFields.find((field) => !req.body[field]);
    if (missing) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const jobData = {
      ...req.body,
      salaryMin: Number(req.body.salaryMin),
      salaryMax: req.body.salaryMax ? Number(req.body.salaryMax) : undefined,
      skills: parseArray(req.body.skills),
      perks: parseArray(req.body.perks),
      employerId: req.user._id,
      status: "active"
    };

    if (req.file) {
      jobData.companyLogo = await uploadToCloudinary(
        req.file.buffer,
        "localhire/company-logos",
        "image"
      );
    }

    const job = await Job.create(jobData);
    res.status(201).json({ message: "Job created", job });
  } catch (error) {
    next(error);
  }
}

export async function updateJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!canManageJob(req.user, job)) {
      return res.status(403).json({ message: "You can only edit your own jobs" });
    }

    const editableFields = [
      "title",
      "company",
      "salaryMin",
      "salaryMax",
      "city",
      "area",
      "category",
      "jobType",
      "experienceRequired",
      "description",
      "phoneNumber",
      "whatsappNumber",
      "status"
    ];

    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = ["salaryMin", "salaryMax"].includes(field)
          ? Number(req.body[field])
          : req.body[field];
      }
    });

    if (req.body.skills !== undefined) job.skills = parseArray(req.body.skills);
    if (req.body.perks !== undefined) job.perks = parseArray(req.body.perks);

    if (req.file) {
      job.companyLogo = await uploadToCloudinary(req.file.buffer, "localhire/company-logos", "image");
    }

    const updatedJob = await job.save();
    res.json({ message: "Job updated", job: updatedJob });
  } catch (error) {
    next(error);
  }
}

export async function deleteJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!canManageJob(req.user, job)) {
      return res.status(403).json({ message: "You can only delete your own jobs" });
    }

    await Application.deleteMany({ jobId: job._id });
    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch (error) {
    next(error);
  }
}

export async function markJobFilled(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!canManageJob(req.user, job)) {
      return res.status(403).json({ message: "You can only update your own jobs" });
    }

    job.isFilled = true;
    await job.save();
    res.json({ message: "Job marked as filled", job });
  } catch (error) {
    next(error);
  }
}

export async function getEmployerJobs(req, res, next) {
  try {
    const jobs = await Job.find({ employerId: req.user._id }).sort({ createdAt: -1 });

    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const applicantCount = await Application.countDocuments({ jobId: job._id });
        return { ...job.toObject(), applicantCount };
      })
    );

    res.json({ jobs: jobsWithCounts });
  } catch (error) {
    next(error);
  }
}
