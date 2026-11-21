const { fitScoreApplies } = require("@/jobs/matchTors");

function withMatchEligibility(tor) {
  const data = typeof tor.toObject === "function" ? tor.toObject() : tor;
  return { ...data, matchEligible: fitScoreApplies(data) };
}

const torCrudService = require("@/services/tor/torCrudService");
const TOR = require("@/models/tor/TOR");

async function getCategoryDistribution(request, response, next) {
  try {
    const result = await TOR.aggregate([
      { $match: { hidden: { $ne: true } } },
      { $project: {
        category: { $trim: { input: { $cond: [
          { $eq: [{ $type: "$category" }, "string"] }, "$category", "",
        ] } } },
      } },
      { $set: { category: { $cond: [
        { $or: [{ $eq: ["$category", ""] }, { $eq: [{ $strcasecmp: ["$category", "Others"] }, 0] }] },
        "Others", "$category",
      ] } } },
      { $group: { _id: "$category", frequency: { $sum: 1 } } },
      { $project: { _id: 0, category: "$_id", frequency: 1 } },
      { $sort: { frequency: -1, category: 1 } },
      { $facet: {
        top: [{ $match: { category: { $ne: "Others" } } }, { $limit: 7 }],
        tail: [{ $match: { category: { $ne: "Others" } } }, { $skip: 7 }],
        others: [{ $match: { category: "Others" } }],
      } },
      { $project: {
        categories: { $concatArrays: ["$top", { $cond: [
          { $gt: [{ $add: [{ $size: "$top" }, { $size: "$tail" }, { $size: "$others" }] }, 0] },
          [{ category: "Others", frequency: { $add: [{ $sum: "$tail.frequency" }, { $sum: "$others.frequency" }] } }],
          [],
        ] }] },
      } },
    ]);
    response.set("Cache-Control", "no-store");
    return response.status(200).json({ categories: result[0]?.categories ?? [] });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return response.status(500).json({ message: "Something went wrong." });
  }
}

async function getTopDepartmentsByBudget(request, response, next) {
  try {
    const departments = await TOR.aggregate([
      // Use the same visible catalog as GET /tors, with no status filter.
      { $match: { hidden: { $ne: true } } },
      { $project: {
        department: { $trim: { input: { $cond: [{ $eq: [{ $type: "$department" }, "string"] }, "$department", ""] } } },
        deptId: { $trim: { input: { $convert: { input: "$egpDeptId", to: "string", onError: "", onNull: "" } } } },
        subId: { $trim: { input: { $convert: { input: "$egpDeptSubId", to: "string", onError: "", onNull: "" } } } },
        budget: { $cond: [
          { $in: [{ $type: "$budgetThb" }, ["int", "long", "double", "decimal", "string"]] },
          { $convert: { input: "$budgetThb", to: "double", onError: 0, onNull: 0 } },
          0,
        ] },
      } },
      { $match: { department: { $ne: "" } } },
      { $group: {
        // A parent e-GP ID alone does not identify a named subdepartment.
        _id: { $cond: [
          { $and: [{ $ne: ["$deptId", ""] }, { $ne: ["$subId", ""] }] },
          { deptId: "$deptId", subId: "$subId" },
          { name: { $toLower: "$department" } },
        ] },
        department: { $min: "$department" },
        totalBudget: { $sum: { $cond: [
          { $and: [{ $gt: ["$budget", 0] }, { $lte: ["$budget", Number.MAX_VALUE] }] },
          "$budget",
          0,
        ] } },
        torCount: { $sum: 1 },
      } },
      { $match: { totalBudget: { $gt: 0 } } },
      { $sort: { totalBudget: -1, torCount: -1, department: 1, _id: 1 } },
      { $limit: 10 },
      { $project: { _id: 0, department: 1, totalBudget: 1, torCount: 1 } },
    ]);
    response.set("Cache-Control", "no-store");
    return response.status(200).json({ departments });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return response.status(500).json({ message: "Something went wrong." });
  }
}

async function getAllTors(request, response, next) {
  try {
    const tors = await torCrudService.getAllTors();
    return response.status(200).json(tors.map(withMatchEligibility));
  } catch (error) {
    if (typeof next === "function") return next(error);
    return response.status(500).json({ message: "Something went wrong." });
  }
}

async function getBudgetPeers(request, response, next) {
  try {
    const category = String(request.query.category || "").trim();
    if (!category) {
      return response.status(400).json({ message: "category is required." });
    }
    const peers = await torCrudService.getBudgetPeers(category);
    return response.status(200).json(peers);
  } catch (error) {
    if (typeof next === "function") return next(error);
    return response.status(500).json({ message: "Something went wrong." });
  }
}

async function getTorById(request, response, next) {
  try {
    if (!/^[a-f0-9]{24}$/i.test(String(request.params.id || ""))) {
      return response.status(404).json({ message: "TOR not found." });
    }
    const tor = await torCrudService.getTorById(request.params.id);
    if (!tor || tor.hidden) {
      return response.status(404).json({ message: "TOR not found." });
    }
    return response.status(200).json(withMatchEligibility(tor));
  } catch (error) {
    if (typeof next === "function") return next(error);
    return response.status(500).json({ message: "Something went wrong." });
  }
}

async function updateTor(request, response, next) {
  try {
    const tor = await torCrudService.updateTor(request.params.id, request.body);
    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }
    return response.status(200).json(withMatchEligibility(tor));
  } catch (error) {
    if (typeof next === "function") return next(error);
    return response.status(500).json({ message: "Something went wrong." });
  }
}

async function deleteTor(request, response, next) {
  try {
    const tor = await torCrudService.deleteTor(request.params.id);
    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }
    return response.status(200).json(withMatchEligibility(tor));
  } catch (error) {
    if (typeof next === "function") return next(error);
    return response.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = {
  deleteTor,
  getAllTors,
  getBudgetPeers,
  getCategoryDistribution,
  getTopDepartmentsByBudget,
  getTorById,
  updateTor,
};
