$srcDir = "c:\Users\Marin Rémy\Downloads\zip\src"
$files = Get-ChildItem -Path $srcDir -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    $content = $content -replace "fetch\('\/api\/profiles", "fetch(getAPIUrl('/profiles"
    $content = $content -replace 'fetch\("\/api\/profiles', 'fetch(getAPIUrl("/profiles'
    $content = $content -replace "fetch\('\/api\/tasks", "fetch(getAPIUrl('/tasks"
    $content = $content -replace 'fetch\("\/api\/tasks', 'fetch(getAPIUrl("/tasks'
    $content = $content -replace "fetch\('\/api\/subtasks", "fetch(getAPIUrl('/subtasks"
    $content = $content -replace 'fetch\("\/api\/subtasks', 'fetch(getAPIUrl("/subtasks'
    $content = $content -replace "fetch\('\/api\/categories", "fetch(getAPIUrl('/categories"
    $content = $content -replace 'fetch\("\/api\/categories', 'fetch(getAPIUrl("/categories'
    $content = $content -replace "fetch\('\/api\/affaires", "fetch(getAPIUrl('/affaires"
    $content = $content -replace 'fetch\("\/api\/affaires', 'fetch(getAPIUrl("/affaires'
    $content = $content -replace "fetch\('\/api\/task-assignees", "fetch(getAPIUrl('/task-assignees"
    $content = $content -replace 'fetch\("\/api\/task-assignees', 'fetch(getAPIUrl("/task-assignees'
    $content = $content -replace "fetch\('\/api\/comments", "fetch(getAPIUrl('/comments"
    $content = $content -replace 'fetch\("\/api\/comments', 'fetch(getAPIUrl("/comments'
    $content = $content -replace "fetch\('\/api\/backups", "fetch(getAPIUrl('/backups"
    $content = $content -replace 'fetch\("\/api\/backups', 'fetch(getAPIUrl("/backups'
    $content = $content -replace "fetch\('\/api\/pomodoro", "fetch(getAPIUrl('/pomodoro"
    $content = $content -replace 'fetch\("\/api\/pomodoro', 'fetch(getAPIUrl("/pomodoro'
    
    Set-Content $file.FullName $content
    Write-Host "Updated: $($file.Name)"
}
