document.getElementById("editButton").addEventListener("click", function() {
    // Enable the form fields for editing (except email)
    document.getElementById("name").disabled = false;
    document.getElementById("organisation").disabled = false;
    document.getElementById("description").disabled = false;
    document.getElementById("linkedin").disabled = false;

    // Show the Submit button and hide the Edit button
    document.getElementById("submitButton").style.display = "inline";
    document.getElementById("editButton").style.display = "none";
});