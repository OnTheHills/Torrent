const { fitScoreApplies } = require("@/jobs/matchTors");

function withMatchEligibility(tor) {
  const data = typeof tor.toObject === "function" ? tor.toObject() : tor;
  return { ...data, matchEligible: fitScoreApplies(data) };
}

const torCrudService = require("@/services/tor/torCrudService");
const TOR = require("@/models/TOR");

async function getTopDepartmentsByBudget(request, response) {
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
    return response.status(500).json({ message: error.message });
  }
}

async function createTor(request, response) {
  try {
    const tor = await torCrudService.createTor(request.body);
    return response.status(201).json(withMatchEligibility(tor));
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getAllTors(request, response) {
  try {
    const tors = await torCrudService.getAllTors();
    return response.status(200).json(tors.map(withMatchEligibility));
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function getTorById(request, response) {
  try {
    const tor = await torCrudService.getTorById(request.params.id);
    if (!tor || tor.hidden) {
      return response.status(404).json({ message: "TOR not found." });
    }
    return response.status(200).json(withMatchEligibility(tor));
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function updateTor(request, response) {
  try {
    const tor = await torCrudService.updateTor(request.params.id, request.body);
    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }
    return response.status(200).json(withMatchEligibility(tor));
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

async function deleteTor(request, response) {
  try {
    const tor = await torCrudService.deleteTor(request.params.id);
    if (!tor) {
      return response.status(404).json({ message: "TOR not found." });
    }
    return response.status(200).json(withMatchEligibility(tor));
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
}

module.exports = { createTor, deleteTor, getAllTors, getTorById, updateTor, getTopDepartmentsByBudget };
