"use strict";

const path = require("path");

const PROFILE_DIR = path.resolve(__dirname, "..", "..", "profile-data");

function findProfileFilePath(profileStore, kind) {
  const profile = profileStore.getProfile();
  const files = profile.files || [];

  if (kind === "resume") {
    const resumeFiles = files.filter((f) => {
      const name = f.source || "";
      return /resume|cv/i.test(name);
    });
    if (resumeFiles.length) {
      return path.join(PROFILE_DIR, resumeFiles[0].source);
    }
  }

  if (kind === "coverLetter") {
    const coverFiles = files.filter((f) => {
      const name = f.source || "";
      return /cover[-_]?letter/i.test(name);
    });
    if (coverFiles.length) {
      return path.join(PROFILE_DIR, coverFiles[0].source);
    }
  }

  return null;
}

module.exports = {
  findProfileFilePath,
};
