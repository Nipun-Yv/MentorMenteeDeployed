document.getElementById("editButton").addEventListener("click", function() {

    document.getElementById("name").disabled = false;
    document.getElementById("organisation").disabled = false;
    document.getElementById("credentials").disabled = false;
    document.getElementById("linkedin").disabled = false;
    document.getElementById("pricing").disabled = false;
    document.getElementById("tags").disabled = false;
  
    document.getElementById("submitButton").style.display = "inline";
    document.getElementById("editButton").style.display = "none";
});
// document.getElementById("editButton").addEventListener("click", function() {
//     var inputs = document.querySelectorAll("#profileForm input, #profileForm textarea, #tagsContainer input");

//     inputs.forEach(function(el) {
//         el.disabled = !el.disabled;
//     });

//     var editButton = document.getElementById("editButton");
//     var submitButton = document.getElementById("submitButton");

//     submitButton.style.display = "inline";
//     editButton.style.display = editButton.style.display === "none" ? "inline" : "none";
// });
